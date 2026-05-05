export function getVisiblePageNumbers(currentPage: number, lastPage: number, maxVisiblePages = 7) {
  const visibleCount = Math.min(maxVisiblePages, lastPage);

  if (lastPage <= maxVisiblePages) {
    return Array.from({ length: visibleCount }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return Array.from({ length: visibleCount }, (_, index) => index + 1);
  }

  if (currentPage >= lastPage - 3) {
    return Array.from({ length: visibleCount }, (_, index) => lastPage - visibleCount + 1 + index);
  }

  return Array.from({ length: visibleCount }, (_, index) => currentPage - 3 + index);
}
