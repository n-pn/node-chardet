export default function binarySearch(arr: number[], searchValue: number) {
  const find = (
    arr: number[],
    searchValue: number,
    left: number,
    right: number
  ): number => {
    if (right < left) return -1;

    /*
    int mid = mid = (left + right) / 2;
    There is a bug in the above line;
    Joshua Bloch suggests the following replacement:
    */
    const mid = Math.floor((left + right) >>> 1);
    if (searchValue > arr[mid]) return find(arr, searchValue, mid + 1, right);

    if (searchValue < arr[mid]) return find(arr, searchValue, left, mid - 1);

    return mid;
  };

  return find(arr, searchValue, 0, arr.length - 1);
}
