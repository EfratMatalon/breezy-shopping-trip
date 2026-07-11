/**
 * Resolves a category image filename to its full public path.
 *   getCategoryImagePath("vegetables.jpeg") → "/images/categories/vegetables.jpeg"
 */
export function getCategoryImagePath(image: string | null | undefined): string | null {
  if (!image) return null;
  return `/images/categories/${image}`;
}

/**
 * Resolves a product image filename to its full public path.
 *   getProductImagePath("dairy", "fresh-milk.jpg") → "/images/products/dairy/fresh-milk.jpg"
 */
export function getProductImagePath(
  categoryId: string | null | undefined,
  image: string | null | undefined,
): string | null {
  if (!categoryId || !image) return null;
  return `/images/products/${categoryId}/${image}`;
}
