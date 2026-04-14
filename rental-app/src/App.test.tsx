describe('rental-app smoke tests', () => {
  it('environment is set up correctly', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('jsdom environment is available', () => {
    expect(typeof document).toBe('object')
    expect(typeof window).toBe('object')
  })
})
