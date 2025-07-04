const addHours = (dateString, hoursToAdd) => {
  const originalDate = new Date(dateString)
  originalDate.setHours(originalDate.getHours() + hoursToAdd)
  return originalDate.toISOString()
}

export default addHours
