export function speak(text: string) {
  if (typeof window === 'undefined') return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.73
  utterance.pitch = 1.2
  speechSynthesis.speak(utterance)
}
