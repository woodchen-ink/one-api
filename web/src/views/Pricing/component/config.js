const extraRatiosConfig = [
  {
    name: '缓存价格',
    key: 'cached_tokens',
    isPrompt: true,
    channelTypes: [1, 25, 42],
    channels: 'OpenAI / Gemini / 返回 cached_tokens 的兼容渠道',
    description: '通常表示命中已缓存输入后的价格，不区分写入和读取。'
  },
  {
    name: '缓存写入价格',
    key: 'cached_write_tokens',
    isPrompt: true,
    channelTypes: [14],
    channels: 'Anthropic Claude',
    description: '适用于 Claude Prompt Caching 的首次写入成本。'
  },
  {
    name: '缓存读取价格',
    key: 'cached_read_tokens',
    isPrompt: true,
    channelTypes: [14],
    channels: 'Anthropic Claude',
    description: '适用于 Claude Prompt Caching 的后续读取成本。'
  },
  {
    name: '音频输入价格',
    key: 'input_audio_tokens',
    isPrompt: true,
    channelTypes: [1, 25, 42],
    channels: 'OpenAI / Gemini / 支持音频输入的渠道',
    description: '输入音频单独计价时使用。'
  },
  {
    name: '音频输出价格',
    key: 'output_audio_tokens',
    isPrompt: false,
    channelTypes: [1, 25, 42],
    channels: 'OpenAI / Gemini / 支持音频输出的渠道',
    description: '输出音频单独计价时使用。'
  },
  {
    name: '推理价格',
    key: 'reasoning_tokens',
    isPrompt: false,
    channelTypes: [1, 14, 25, 42],
    channels: 'OpenAI Reasoning / Gemini Thinking / 类似渠道',
    description: '适用于 reasoning 或 thinking token 单独计价的模型。'
  },
  {
    name: '输入文本价格',
    key: 'input_text_tokens',
    isPrompt: true,
    channelTypes: [1, 25, 42],
    channels: '支持细分文本 token 的多模态渠道',
    description: '当输入文本需要和其他模态拆分计价时使用。'
  },
  {
    name: '输出文本价格',
    key: 'output_text_tokens',
    isPrompt: false,
    channelTypes: [1, 25, 42],
    channels: '支持细分文本 token 的多模态渠道',
    description: '当输出文本需要和其他模态拆分计价时使用。'
  },
  {
    name: '输入图片价格',
    key: 'input_image_tokens',
    isPrompt: true,
    channelTypes: [1, 25, 42],
    channels: 'OpenAI / Gemini / 支持图片输入的渠道',
    description: '输入图片 token 单独计价时使用。'
  },
  {
    name: '输出图片价格',
    key: 'output_image_tokens',
    isPrompt: false,
    channelTypes: [1, 25, 42],
    channels: 'OpenAI / Gemini / 支持图片输出的渠道',
    description: '输出图片 token 单独计价时使用。'
  }
];

export { extraRatiosConfig };
