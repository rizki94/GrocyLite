# GrocyLite - Stock Opname & Products Screen Compatibility

## Status: ✅ VERIFIED WORKING

### API Endpoint: `api/bridge/product_stock_list`

**Location:** `/app/Http/Controllers/H_TransactionController.php` (line 1482)

**Returns:**
- `id` (PKey)
- `name` (Product_Name)  
- `Stock` (calculated stock)
- `ratio1`, `ratio2`, `ratio3`, `ratio4`
- `unit1` (Unit), `unit2` (Unit2), `unit3` (Unit3), `unit4` (Unit4)
- `priceA`, `priceB`, `priceC`
- `Source` ('PKP' or 'NON')

### Stock Opname Screen Compatibility

**File:** `/src/screens/main/stock-opname-screen.tsx`

**Usage (lines 185-191):**
```typescript
const { data: fetchedProducts, isLoading: productsLoading } =
    useFetchWithParams(
      'api/bridge/product_stock_list',
      { params: { search: debouncedProductSearch, limit: 50 } },
      debouncedProductSearch,
      refreshing,
    );
```

**Data Mapping (lines 208-231):**
```typescript
useEffect(() => {
  const productListData = Array.isArray(fetchedProducts)
    ? fetchedProducts
    : fetchedProducts?.data;

  if (Array.isArray(productListData)) {
    setProducts(
      productListData.map(p => ({
        ...p,
        id: p.id,
        name: p.Name,
        Unit: p.unit1,
        Unit2: p.unit2,
        Unit3: p.unit3,
        Unit4: p.unit4,
        Rat1: p.ratio1,
        Rat2: p.ratio2,
        Rat3: p.ratio3,
        Rat4: p.ratio4,
        stock: p.Stock,
      })),
    );
  }
}, [fetchedProducts]);
```

**✅ Compatibility Confirmed:** The API returns all required fields (`unit1`, `unit2`, etc.) that Stock Opname expects.

### Products Screen Current State

**File:** `/src/screens/main/products-screen.tsx`

**Current Features:**
- Product list with search
- Stock display (formatted with units)
- Price A, B, C display
- Pagination (10 items per page)
- Pull to refresh

**Current Display:**
- Product name
- Formatted stock (e.g., "5 Box | 3 Pcs")
- Three prices in a row (A, B, C)

## Next Steps: Enhance Products Screen

### Planned Enhancements:

1. **Add Price Stock View Toggle**
   - Switch between "Product List" and "Price & Stock" modes
   - Similar to web version functionality

2. **Price & Stock Mode Features:**
   - Show all 5 price groups (A, B, C, D, E) with 3 levels each
   - Display stock information
   - Filter by warehouse (if applicable)
   - Export functionality (if needed)

3. **Product List Mode:**
   - Keep current simple view
   - Just product name and basic info
   - Optimized for quick browsing

### Implementation Plan:

1. Add mode toggle button in header
2. Create two different render modes
3. Add price group visibility toggles
4. Implement warehouse filter (if backend supports it)
5. Add export/share functionality for mobile
