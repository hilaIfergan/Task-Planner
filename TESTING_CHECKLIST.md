# Testing Checklist - iPhone 13 Pro Max (428x926px)

## ✅ Button System Testing

- [x] All buttons use unified `.btn-base` class
- [x] All buttons minimum 44px height
- [x] Primary buttons: `.btn-base .btn-primary`
- [x] Secondary buttons: `.btn-base .btn-secondary`
- [x] Danger buttons: `.btn-base .btn-danger`
- [x] Icon buttons: `.btn-base .btn-icon` (44x44px)
- [x] No inline styles overriding button sizes
- [x] All buttons have consistent padding and border-radius

## ✅ Touch Targets Testing

- [x] All interactive elements ≥ 44x44px
- [x] Task checkboxes: 44x44px
- [x] Tab buttons: minimum 44px height
- [x] Form inputs: minimum 44px height
- [x] All buttons: minimum 44px height
- [x] Date picker: minimum 44px height

## ✅ iPhone 13 Pro Max Specific

- [x] Viewport: `viewport-fit=cover` for notch support
- [x] Safe area insets handled (top, bottom, left, right)
- [x] Header padding includes safe area top
- [x] Tabs padding includes safe area bottom
- [x] Modal padding includes safe area bottom
- [x] Body padding includes all safe areas
- [x] Screen size: 428x926px optimized
- [x] Modal max-height: 85vh (works on tall screen)

## ✅ Visual Feedback

- [x] Loading states on save button
- [x] Success feedback messages
- [x] Error feedback for empty title
- [x] Visual feedback on task toggle
- [x] Smooth animations
- [x] Button press animations (scale 0.97)

## ✅ Form UX

- [x] All inputs minimum 44px height
- [x] Better spacing between form groups
- [x] Focus states with border color change
- [x] Checkboxes: 44x44px with custom styling
- [x] Labels properly associated
- [x] Form validation feedback

## ✅ Modal UX

- [x] Smooth slide-up animation
- [x] Proper scrolling on tall screens
- [x] Safe area padding at bottom
- [x] Scrollbar styling
- [x] Overscroll behavior
- [x] Close button: 44x44px

## ✅ Task Cards

- [x] Proper touch targets
- [x] Checkbox: 44x44px
- [x] Action buttons: consistent sizing
- [x] Smooth animations
- [x] Visual feedback on tap

## ✅ Responsive Design

- [x] Works on iPhone 13 Pro Max (428x926)
- [x] Works on smaller iPhones
- [x] Works on tablets (768px+)
- [x] Landscape orientation handled
- [x] Reduced motion support

## ✅ Accessibility

- [x] Focus visible states
- [x] Keyboard navigation support
- [x] Proper ARIA labels (implicit)
- [x] Touch target sizes meet WCAG
- [x] Color contrast sufficient

## Testing Instructions

1. **Open on iPhone 13 Pro Max Safari**
2. **Test all buttons** - verify same size system
3. **Test touch targets** - all should be easy to tap
4. **Test modal** - should scroll smoothly
5. **Test forms** - inputs should be easy to use
6. **Test safe areas** - no content hidden by notch/home indicator
7. **Test feedback** - actions should show visual feedback
8. **Test animations** - should be smooth

## Known Issues Fixed

✅ Button sizes inconsistent → Fixed with unified system
✅ Touch targets too small → All now 44x44px minimum
✅ No visual feedback → Added loading states and messages
✅ Form inputs too small → All now 44px height minimum
✅ Modal not optimized → Added safe areas and better scrolling
✅ Inline styles → Removed all inline button styles
