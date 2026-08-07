package controller

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// upstreamAccountPool describes a subscription-bridge account pool that this
// gateway can manage on behalf of an administrator. The pool's admin key is a
// server-side secret and is never exposed to the browser: the frontend talks to
// new-api with its normal session, and new-api attaches the admin key when it
// proxies to the bridge's internal admin API.
type upstreamAccountPool struct {
	Name     string `json:"name"`
	BaseURL  string `json:"base_url"`
	AdminKey string `json:"admin_key"`
}

// upstreamAccountPoolPublic is the browser-safe projection of a pool: it drops
// the admin key and the internal base URL, keeping only what the UI needs.
type upstreamAccountPoolPublic struct {
	Name string `json:"name"`
}

var (
	upstreamPoolsOnce sync.Once
	upstreamPools     map[string]upstreamAccountPool
	upstreamPoolOrder []string
)

// loadUpstreamAccountPools parses the UPSTREAM_ACCOUNT_POOLS env var once. The
// value is a JSON array such as:
//
//	[{"name":"devin-native","base_url":"http://native-adapter:3004","admin_key":"..."}]
//
// Keeping the config in the environment (not the database) means raw bridge
// admin secrets never live in application data or leave the server.
func loadUpstreamAccountPools() {
	upstreamPoolsOnce.Do(func() {
		upstreamPools = make(map[string]upstreamAccountPool)
		raw := strings.TrimSpace(common.GetEnvOrDefaultString("UPSTREAM_ACCOUNT_POOLS", ""))
		if raw == "" {
			return
		}
		var parsed []upstreamAccountPool
		if err := common.Unmarshal([]byte(raw), &parsed); err != nil {
			common.SysError("failed to parse UPSTREAM_ACCOUNT_POOLS: " + err.Error())
			return
		}
		for _, p := range parsed {
			name := strings.TrimSpace(p.Name)
			base := strings.TrimSpace(p.BaseURL)
			if name == "" || base == "" {
				continue
			}
			p.Name = name
			p.BaseURL = strings.TrimRight(base, "/")
			if _, exists := upstreamPools[name]; !exists {
				upstreamPoolOrder = append(upstreamPoolOrder, name)
			}
			upstreamPools[name] = p
		}
	})
}

func resolveUpstreamPool(c *gin.Context) (upstreamAccountPool, bool) {
	loadUpstreamAccountPools()
	name := strings.TrimSpace(c.Param("pool"))
	pool, ok := upstreamPools[name]
	if !ok {
		common.ApiErrorMsg(c, fmt.Sprintf("unknown upstream account pool: %s", name))
		return upstreamAccountPool{}, false
	}
	return pool, true
}

// GetUpstreamAccountPools lists the configured pools without leaking secrets.
func GetUpstreamAccountPools(c *gin.Context) {
	loadUpstreamAccountPools()
	pools := make([]upstreamAccountPoolPublic, 0, len(upstreamPoolOrder))
	for _, name := range upstreamPoolOrder {
		pools = append(pools, upstreamAccountPoolPublic{Name: name})
	}
	common.ApiSuccess(c, pools)
}

// proxyUpstreamAdmin forwards the current request to the bridge admin API,
// injecting the server-side admin key and relaying the JSON response verbatim.
func proxyUpstreamAdmin(c *gin.Context, pool upstreamAccountPool, method, path string) {
	var body io.Reader
	if c.Request.Body != nil {
		raw, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
		if err != nil {
			common.ApiErrorMsg(c, "failed to read request body")
			return
		}
		if len(raw) > 0 {
			body = bytes.NewReader(raw)
		}
	}

	url := pool.BaseURL + path
	req, err := http.NewRequestWithContext(c.Request.Context(), method, url, body)
	if err != nil {
		common.ApiErrorMsg(c, "failed to build upstream request")
		return
	}
	req.Header.Set("content-type", "application/json")
	req.Header.Set("accept", "application/json")
	if pool.AdminKey != "" {
		req.Header.Set("x-admin-key", pool.AdminKey)
		req.Header.Set("authorization", "Bearer "+pool.AdminKey)
	}

	client := service.GetHttpClient()
	resp, err := client.Do(req)
	if err != nil {
		common.SysError(fmt.Sprintf("upstream account pool %s unreachable: %v", pool.Name, err))
		common.ApiErrorMsg(c, fmt.Sprintf("upstream account pool %s is unreachable", pool.Name))
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		common.ApiErrorMsg(c, "failed to read upstream response")
		return
	}

	if resp.StatusCode >= 400 {
		msg := strings.TrimSpace(string(respBody))
		if msg == "" {
			msg = resp.Status
		}
		common.ApiErrorMsg(c, fmt.Sprintf("upstream pool %s returned %d: %s", pool.Name, resp.StatusCode, msg))
		return
	}

	var payload any
	if len(bytes.TrimSpace(respBody)) > 0 {
		if err := common.Unmarshal(respBody, &payload); err != nil {
			common.ApiErrorMsg(c, "invalid upstream response")
			return
		}
	}
	common.ApiSuccess(c, payload)
}

// upstreamAccountID reads and validates the account id path param. The id is
// escaped again before it is placed in the upstream URL, but rejecting empty or
// path-like ids here keeps traversal attempts out of the audit log too.
func upstreamAccountID(c *gin.Context) (string, bool) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" || strings.ContainsAny(id, "/\\") || strings.Contains(id, "..") {
		common.ApiErrorMsg(c, "invalid account id")
		return "", false
	}
	return id, true
}

func recordUpstreamAudit(c *gin.Context, pool upstreamAccountPool, action string) {
	userId := c.GetInt("id")
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("上游账号管理：%s（账号池 %s）", action, pool.Name))
}

// ListUpstreamAccounts returns the pool's account snapshot (token-tail only).
func ListUpstreamAccounts(c *gin.Context) {
	pool, ok := resolveUpstreamPool(c)
	if !ok {
		return
	}
	proxyUpstreamAdmin(c, pool, http.MethodGet, "/admin/accounts")
}

// GetUpstreamAccountsHealth returns per-account live health for the pool.
func GetUpstreamAccountsHealth(c *gin.Context) {
	pool, ok := resolveUpstreamPool(c)
	if !ok {
		return
	}
	proxyUpstreamAdmin(c, pool, http.MethodGet, "/health")
}

// CreateUpstreamAccount uploads a new account credential to the pool.
func CreateUpstreamAccount(c *gin.Context) {
	pool, ok := resolveUpstreamPool(c)
	if !ok {
		return
	}
	recordUpstreamAudit(c, pool, "新增账号")
	proxyUpstreamAdmin(c, pool, http.MethodPost, "/admin/accounts")
}

// UpdateUpstreamAccount changes an account's weight/label/enabled state or token.
func UpdateUpstreamAccount(c *gin.Context) {
	pool, ok := resolveUpstreamPool(c)
	if !ok {
		return
	}
	id, ok := upstreamAccountID(c)
	if !ok {
		return
	}
	recordUpstreamAudit(c, pool, "更新账号 "+id)
	proxyUpstreamAdmin(c, pool, http.MethodPatch, "/admin/accounts/"+url.PathEscape(id))
}

// DeleteUpstreamAccount removes an account from the pool.
func DeleteUpstreamAccount(c *gin.Context) {
	pool, ok := resolveUpstreamPool(c)
	if !ok {
		return
	}
	id, ok := upstreamAccountID(c)
	if !ok {
		return
	}
	recordUpstreamAudit(c, pool, "删除账号 "+id)
	proxyUpstreamAdmin(c, pool, http.MethodDelete, "/admin/accounts/"+url.PathEscape(id))
}

// ProbeUpstreamAccount verifies one account's credential now via the bridge's
// zero-cost status probe, so an operator can confirm a freshly added credential
// (and its proxy route) without waiting for real traffic.
func ProbeUpstreamAccount(c *gin.Context) {
	pool, ok := resolveUpstreamPool(c)
	if !ok {
		return
	}
	id, ok := upstreamAccountID(c)
	if !ok {
		return
	}
	recordUpstreamAudit(c, pool, "探活账号 "+id)
	proxyUpstreamAdmin(c, pool, http.MethodPost, "/admin/accounts/"+url.PathEscape(id)+"/probe")
}
