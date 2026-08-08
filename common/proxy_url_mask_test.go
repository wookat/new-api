package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMaskProxyURL(t *testing.T) {
	cases := []struct {
		name     string
		proxyURL string
		expected string
	}{
		{
			name:     "credentials replaced with placeholder",
			proxyURL: "http://relay_user:s3cret@10.0.0.1:8890",
			expected: "http://***:***@10.0.0.1:8890",
		},
		{
			name:     "username only still masked",
			proxyURL: "socks5://relay_user@10.0.0.1:1080",
			expected: "socks5://***:***@10.0.0.1:1080",
		},
		{
			name:     "no credentials left untouched",
			proxyURL: "http://10.0.0.1:8890",
			expected: "http://10.0.0.1:8890",
		},
		{
			name:     "empty stays empty",
			proxyURL: "",
			expected: "",
		},
		{
			name:     "unparsable value returned verbatim",
			proxyURL: "not a proxy",
			expected: "not a proxy",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, MaskProxyURL(tc.proxyURL))
		})
	}
}

func TestProxyURLCredentialsAreMasked(t *testing.T) {
	assert.True(t, ProxyURLCredentialsAreMasked("http://***:***@10.0.0.1:8890"))
	assert.False(t, ProxyURLCredentialsAreMasked("http://relay_user:s3cret@10.0.0.1:8890"))
	assert.False(t, ProxyURLCredentialsAreMasked("http://10.0.0.1:8890"))
	assert.False(t, ProxyURLCredentialsAreMasked(""))
}

func TestProxyURLsShareEndpoint(t *testing.T) {
	assert.True(t, ProxyURLsShareEndpoint("http://***:***@10.0.0.1:8890", "http://relay_user:s3cret@10.0.0.1:8890"))
	assert.False(t, ProxyURLsShareEndpoint("http://***:***@10.0.0.2:8890", "http://relay_user:s3cret@10.0.0.1:8890"))
	assert.False(t, ProxyURLsShareEndpoint("http://***:***@10.0.0.1:8891", "http://relay_user:s3cret@10.0.0.1:8890"))
	assert.False(t, ProxyURLsShareEndpoint("https://***:***@10.0.0.1:8890", "http://relay_user:s3cret@10.0.0.1:8890"))
	assert.False(t, ProxyURLsShareEndpoint("http://***:***@10.0.0.1:8890", ""))
}
