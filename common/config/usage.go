package config

const (
	UsageExtraCache         = "cached_tokens"          // 缓存
	UsageExtraCachedWrite   = "cached_write_tokens"    // 缓存写入（兼容旧字段）
	UsageExtraCachedWrite5m = "cached_write_5m_tokens" // 5分钟缓存写入
	UsageExtraCachedWrite1h = "cached_write_1h_tokens" // 1小时缓存写入
	UsageExtraCachedRead    = "cached_read_tokens"     // 缓存读取

	UsageExtraInputAudio        = "input_audio_tokens"  // 输入音频
	UsageExtraOutputAudio       = "output_audio_tokens" // 输出音频
	UsageExtraReasoning         = "reasoning_tokens"    // 推理
	UsageExtraInputTextTokens   = "input_text_tokens"   // 输入文本
	UsageExtraOutputTextTokens  = "output_text_tokens"  // 输出文本
	UsageExtraInputImageTokens  = "input_image_tokens"  // 输入图像
	UsageExtraOutputImageTokens = "output_image_tokens" // 输出图像
)
