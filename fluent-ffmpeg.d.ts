declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    audioBits(value: number): FfmpegCommand
    audioChannels(value: number): FfmpegCommand
    audioFrequency(value: number): FfmpegCommand
    format(value: string): FfmpegCommand
    addOutputOptions(options: string[]): FfmpegCommand
    save(path: string): FfmpegCommand
    on(event: 'end', callback: () => void): FfmpegCommand
    on(event: 'error', callback: (err: Error) => void): FfmpegCommand
    on(event: 'progress', callback: (progress: any) => void): FfmpegCommand
    pipe(dest: any, spawn?: any): FfmpegCommand
  }

  interface FfmpegStatic {
    (input: string | Buffer): FfmpegCommand
    setFfmpegPath(path: string): void
  }

  const ffmpeg: FfmpegStatic

  export = ffmpeg
}
