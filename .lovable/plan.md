

## Add Search Filter Bar After Hero Section

### What
Add a prominent search/filter bar right after the hero section on the landing page, allowing visitors to quickly search for tutors by location (district), subject, and tutoring mode — then navigate to `/tutors` with those filters applied.

### Design
A visually distinct card-style bar with three filter dropdowns and a search button, placed between the hero wave and the stats section. Filters:
1. **District** — dropdown populated from the `districts` table
2. **Subject** — dropdown populated from the `subjects` table  
3. **Tutoring Mode** — static options: Online, In-Person, Both

Clicking "Search" navigates to `/tutors?district=X&subject=Y&mode=Z` with selected values as URL params.

### Technical Details

**File: `src/pages/Index.tsx`**
- Import `useState`, `useEffect`, `useNavigate`, `supabase`, and `Select` UI components
- Add state for districts/subjects lists (fetched on mount) and selected filter values
- Insert a new section between lines 101 (end of hero) and 103 (stats section):
  - A container with a card holding 3 `Select` dropdowns in a row + a Search button
  - On mobile: stack vertically; on desktop: horizontal row
  - On submit: `navigate('/tutors?district=...&subject=...&mode=...')`
- Style: elevated card with shadow, slight negative margin to overlap the hero wave for visual pop

**No database or backend changes needed** — districts and subjects tables already exist.

