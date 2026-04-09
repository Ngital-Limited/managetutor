

## Add Verified Badge to Tutor Cards

### Current State
The tutor cards already have a small verified badge (line 350-354), but it's just a tiny green icon inside a badge with no text — easy to miss.

### Plan

**File: `src/pages/FindTutors.tsx`**

Replace the current minimal badge (lines 350-354) with a more prominent verified badge that includes text:

```tsx
{tutor.verification_status === 'approved' && (
  <Badge className="bg-green-500 text-white border-0 gap-1 px-2 py-0.5">
    <CheckCircle2 className="h-3.5 w-3.5" />
    <span>Verified</span>
  </Badge>
)}
```

This makes the badge visually prominent with a solid green background and "Verified" text label, clearly distinguishing verified tutors at a glance.

