/** Show FMP1078 in UI; still accepts legacy INSTALL-… / FMP-… ids from the API. */
export function formatInstallJobId(id?: string | null) {
  if (!id) return ''
  if (id.startsWith('INSTALL-BULK')) {
    return `FMPBULK${id.slice('INSTALL-BULK'.length).replace(/^-+/, '')}`
  }
  if (id.startsWith('INSTALL-')) {
    return `FMP${id.slice('INSTALL-'.length)}`
  }
  if (id.startsWith('FMP-BULK')) {
    return `FMPBULK${id.slice('FMP-BULK'.length).replace(/^-+/, '')}`
  }
  if (id.startsWith('FMP-')) {
    return `FMP${id.slice('FMP-'.length)}`
  }
  return id
}
