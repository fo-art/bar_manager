const KEY = 'bar_id'

export function getActiveBar() {
  try { return localStorage.getItem(KEY) || '' } catch (e) { return '' }
}

export function chooseBar(list) {
  const found = list.find((b) => b.id === getActiveBar())
  return found ? found.id : list[0].id
}
