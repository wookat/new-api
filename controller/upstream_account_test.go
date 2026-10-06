package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// resetUpstreamPools lets each test install its own pool configuration despite
// the production loader being a sync.Once.
func resetUpstreamPools(t *testing.T, pools ...upstreamAccountPool) {
	t.Helper()
	previousPools, previousOrder := upstreamPools, upstreamPoolOrder
	t.Cleanup(func() {
		upstreamPools, upstreamPoolOrder = previousPools, previousOrder
	})
	upstreamPools = make(map[string]upstreamAccountPool, len(pools))
	upstreamPoolOrder = nil
	for _, p := range pools {
		upstreamPools[p.Name] = p
		upstreamPoolOrder = append(upstreamPoolOrder, p.Name)
	}
	upstreamPoolsOnce.Do(func() {})
}

func TestGetUpstreamAccountPoolsHidesAdminSecrets(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetUpstreamPools(t, upstreamAccountPool{
		Name:     "devin-native",
		BaseURL:  "http://native-adapter:3004",
		AdminKey: "super-secret-admin-key",
	})

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upstream-account/pools", nil)

	GetUpstreamAccountPools(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	body := recorder.Body.String()
	assert.Contains(t, body, "devin-native")
	assert.NotContains(t, body, "super-secret-admin-key")
	assert.NotContains(t, body, "native-adapter:3004")
}

func TestResolveUpstreamPoolRejectsUnknownPool(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetUpstreamPools(t, upstreamAccountPool{Name: "devin-native", BaseURL: "http://adapter:3004"})

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upstream-account/pools/ghost/accounts", nil)
	c.Params = gin.Params{{Key: "pool", Value: "ghost"}}

	_, ok := resolveUpstreamPool(c)

	assert.False(t, ok)
	assert.Contains(t, recorder.Body.String(), "unknown upstream account pool")
	assert.Contains(t, recorder.Body.String(), `"success":false`)
}

func TestProxyUpstreamAdminInjectsAdminKeyAndRelaysPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	var gotAdminKey, gotAuthorization, gotBody, gotMethod, gotPath string
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAdminKey = r.Header.Get("x-admin-key")
		gotAuthorization = r.Header.Get("authorization")
		gotMethod = r.Method
		gotPath = r.URL.Path
		raw := make([]byte, r.ContentLength)
		if r.ContentLength > 0 {
			_, _ = r.Body.Read(raw)
		}
		gotBody = string(raw)
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"accounts":[{"id":"acc1","token_tail":"9f2c","enabled":true}]}`))
	}))
	defer bridge.Close()

	pool := upstreamAccountPool{Name: "devin-native", BaseURL: bridge.URL, AdminKey: "admin-key-1"}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/upstream-account/pools/devin-native/accounts",
		strings.NewReader(`{"token":"raw-upstream-token","label":"primary"}`),
	)

	proxyUpstreamAdmin(c, pool, http.MethodPost, "/admin/accounts")

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "admin-key-1", gotAdminKey)
	assert.Equal(t, "Bearer admin-key-1", gotAuthorization)
	assert.Equal(t, http.MethodPost, gotMethod)
	assert.Equal(t, "/admin/accounts", gotPath)
	assert.Contains(t, gotBody, "raw-upstream-token")

	var parsed struct {
		Success bool `json:"success"`
		Data    struct {
			Accounts []struct {
				ID        string `json:"id"`
				TokenTail string `json:"token_tail"`
			} `json:"accounts"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &parsed))
	assert.True(t, parsed.Success)
	require.Len(t, parsed.Data.Accounts, 1)
	assert.Equal(t, "acc1", parsed.Data.Accounts[0].ID)
	assert.Equal(t, "9f2c", parsed.Data.Accounts[0].TokenTail)
	assert.NotContains(t, recorder.Body.String(), "admin-key-1")
}

func TestProxyUpstreamAdminMapsBridgeFailureToApiError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":{"message":"admin API disabled or unauthorized"}}`))
	}))
	defer bridge.Close()

	pool := upstreamAccountPool{Name: "devin-native", BaseURL: bridge.URL, AdminKey: "wrong-key"}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upstream-account/pools/devin-native/accounts", nil)

	proxyUpstreamAdmin(c, pool, http.MethodGet, "/admin/accounts")

	// The gateway always answers 200 with success=false, matching new-api's
	// existing API envelope, and never echoes the admin key back.
	require.Equal(t, http.StatusOK, recorder.Code)
	body := recorder.Body.String()
	assert.Contains(t, body, `"success":false`)
	assert.Contains(t, body, "403")
	assert.Contains(t, body, "admin API disabled or unauthorized")
	assert.NotContains(t, body, "wrong-key")
}

func TestProbeUpstreamAccountForwardsToBridgeProbePath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	var gotMethod, gotPath, gotAdminKey string
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAdminKey = r.Header.Get("x-admin-key")
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"verification":"verified","reachable":true,"plan":"pro"}`))
	}))
	defer bridge.Close()

	resetUpstreamPools(t, upstreamAccountPool{Name: "devin-native", BaseURL: bridge.URL, AdminKey: "admin-key-1"})

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upstream-account/pools/devin-native/accounts/acc1/probe", nil)
	c.Params = gin.Params{{Key: "pool", Value: "devin-native"}, {Key: "id", Value: "acc1"}}

	ProbeUpstreamAccount(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, http.MethodPost, gotMethod)
	assert.Equal(t, "/admin/accounts/acc1/probe", gotPath)
	assert.Equal(t, "admin-key-1", gotAdminKey)
	body := recorder.Body.String()
	assert.Contains(t, body, "verified")
	assert.NotContains(t, body, "admin-key-1")
}

func TestUpstreamAccountRoutesRejectPathTraversalIds(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetUpstreamPools(t, upstreamAccountPool{Name: "devin-native", BaseURL: "http://adapter:3004", AdminKey: "k"})

	for _, id := range []string{"../secret", "a/b", "", ".."} {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/upstream-account/pools/devin-native/accounts/x/probe", nil)
		c.Params = gin.Params{{Key: "pool", Value: "devin-native"}, {Key: "id", Value: id}}

		ProbeUpstreamAccount(c)

		body := recorder.Body.String()
		assert.Contains(t, body, "invalid account id", "id %q should be rejected", id)
	}
}

func TestProxyUpstreamAdminReportsUnreachableBridge(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	// Bind and immediately close so the port is guaranteed to refuse connections.
	bridge := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	deadURL := bridge.URL
	bridge.Close()

	pool := upstreamAccountPool{Name: "devin-native", BaseURL: deadURL, AdminKey: "admin-key-1"}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upstream-account/pools/devin-native/accounts", nil)

	proxyUpstreamAdmin(c, pool, http.MethodGet, "/admin/accounts")

	require.Equal(t, http.StatusOK, recorder.Code)
	body := recorder.Body.String()
	assert.Contains(t, body, `"success":false`)
	assert.Contains(t, body, "is unreachable")
	assert.NotContains(t, body, "admin-key-1")
}

func TestGetUpstreamAccountPoolsMergesBridgeCapabilities(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	var gotAdminKey string
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/admin/capabilities", r.URL.Path)
		gotAdminKey = r.Header.Get("x-admin-key")
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"login_methods":["devin"]}`))
	}))
	defer bridge.Close()

	resetUpstreamPools(t, upstreamAccountPool{Name: "devin-native", BaseURL: bridge.URL, AdminKey: "admin-key-1"})

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upstream-account/pools", nil)

	GetUpstreamAccountPools(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "admin-key-1", gotAdminKey)
	body := recorder.Body.String()
	assert.Contains(t, body, `"login_methods":["devin"]`)
	assert.NotContains(t, body, "admin-key-1")
}

func TestGetUpstreamAccountPoolsToleratesBridgeWithoutCapabilities(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	// A bridge that predates /admin/capabilities (404) must still list: the
	// page renders with token-paste onboarding only.
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer bridge.Close()

	resetUpstreamPools(t, upstreamAccountPool{Name: "devin-native", BaseURL: bridge.URL, AdminKey: "k"})

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upstream-account/pools", nil)

	GetUpstreamAccountPools(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	body := recorder.Body.String()
	assert.Contains(t, body, "devin-native")
	assert.Contains(t, body, `"login_methods":null`)
}

func TestDevinLoginUpstreamAccountForwardsToBridgeLoginPath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	var gotMethod, gotPath, gotAdminKey, gotBody string
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAdminKey = r.Header.Get("x-admin-key")
		raw := make([]byte, r.ContentLength)
		if r.ContentLength > 0 {
			_, _ = r.Body.Read(raw)
		}
		gotBody = string(raw)
		w.Header().Set("content-type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"account":{"id":"acc3","label":"devin:a@b.c"},"verification":"verified"}`))
	}))
	defer bridge.Close()

	resetUpstreamPools(t, upstreamAccountPool{Name: "devin-native", BaseURL: bridge.URL, AdminKey: "admin-key-1"})

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/upstream-account/pools/devin-native/devin-login",
		strings.NewReader(`{"email":"a@b.c","password":"secret-pw"}`),
	)
	c.Params = gin.Params{{Key: "pool", Value: "devin-native"}}

	DevinLoginUpstreamAccount(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, http.MethodPost, gotMethod)
	assert.Equal(t, "/admin/accounts/devin-login", gotPath)
	assert.Equal(t, "admin-key-1", gotAdminKey)
	// The password transits to the bridge verbatim (it mints the credential
	// there) and is never echoed back in the gateway response.
	assert.Contains(t, gotBody, "secret-pw")
	body := recorder.Body.String()
	assert.Contains(t, body, "verified")
	assert.NotContains(t, body, "secret-pw")
	assert.NotContains(t, body, "admin-key-1")
}
