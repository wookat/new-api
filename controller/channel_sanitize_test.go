package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSanitizeChannelForResponseMasksProxyCredentials(t *testing.T) {
	channel := &model.Channel{
		Setting: common.GetPointer[string](`{"proxy":"http://relay_user:s3cret@10.0.0.1:8890","force_format":true}`),
	}

	sanitizeChannelForResponse(channel)

	require.NotNil(t, channel.Setting)
	assert.NotContains(t, *channel.Setting, "s3cret")
	assert.NotContains(t, *channel.Setting, "relay_user")
	assert.Contains(t, *channel.Setting, "http://***:***@10.0.0.1:8890")
	// Unrelated settings must survive the rewrite.
	assert.Contains(t, *channel.Setting, "force_format")
}

func TestSanitizeChannelForResponseLeavesCredentiallessSettingUntouched(t *testing.T) {
	original := `{"proxy":"http://10.0.0.1:8890"}`
	channel := &model.Channel{Setting: common.GetPointer[string](original)}

	sanitizeChannelForResponse(channel)

	require.NotNil(t, channel.Setting)
	assert.Equal(t, original, *channel.Setting)
}

func TestSanitizeChannelForResponseDropsMalformedSetting(t *testing.T) {
	channel := &model.Channel{Setting: common.GetPointer[string](`{"proxy":`)}

	sanitizeChannelForResponse(channel)

	assert.Nil(t, channel.Setting)
}
