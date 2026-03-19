const extraRatiosConfig = [
  {
    name: '缓存价格',
    key: 'cached_tokens',
    isPrompt: true
  },
  {
    name: '缓存写入价格 (Claude)',
    key: 'cached_write_tokens',
    isPrompt: true
  },
  {
    name: '缓存读取价格 (Claude)',
    key: 'cached_read_tokens',
    isPrompt: true
  },
  {
    name: '音频输入价格',
    key: 'input_audio_tokens',
    isPrompt: true
  },
  {
    name: '音频输出价格',
    key: 'output_audio_tokens',
    isPrompt: false
  },
  {
    name: '推理价格',
    key: 'reasoning_tokens',
    isPrompt: false
  },
  {
    name: '输入文本价格',
    key: 'input_text_tokens',
    isPrompt: true
  },
  {
    name: '输出文本价格',
    key: 'output_text_tokens',
    isPrompt: false
  },
  {
    name: '输入图片价格',
    key: 'input_image_tokens',
    isPrompt: true
  },
  {
    name: '输出图片价格',
    key: 'output_image_tokens',
    isPrompt: false
  }
];

export { extraRatiosConfig };
