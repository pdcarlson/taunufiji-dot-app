# Product Guidelines

## Visual Identity & Aesthetics

- **High-Contrast & Professional**: Maintain a focused, professional palette with sharp borders and high contrast. The goal is a "Digital Chapter" look that feels reliable and authoritative.
- **Typography**: Utilize established brand fonts ("Bebas Neue", "Langdon") to maintain fraternal identity.
- **Flexible Utility-Based Design**: Stick with the utility-first (Tailwind) approach for speed and flexibility. Focus on consistent patterns rather than rigid, over-abstracted component libraries.

## Communication & Prose Style

- **Casual & Direct**: Keep notifications and instructions short, punchy, and modern. Communication should be efficient — "Get it done" rather than flowery prose.
- **Encouraging & Positive**: While direct, the system should highlight the value of contributions and the benefits of earning Scholarship Points to drive engagement.
- **Terminology**: Use specific fraternal terms where appropriate ("Brothers", "Cabinet", "Housing Chair") but keep surrounding language accessible.

## Error Handling & Feedback

- **Technical & Transparent**: Since the user/developer base is technically inclined, provide detailed error messages. Transparency is preferred over vague "Something went wrong" messages.
- **Actionable Failures**: Even when technical, errors should imply or state the necessary next steps (e.g., missing permissions, network timeouts).

## Responsive Strategy

- **Balanced Responsive**: Features must function seamlessly across all screen sizes.
  - **Mobile**: Critical for Brothers performing chores and submitting proof in real-time.
  - **Desktop**: Critical for Admin roles managing complex schedules and reviewing data-heavy ledger histories.

## Engineering Principles for UI

- **Pattern Over Abstraction**: Prioritize repeating successful UI patterns from the existing dashboard over creating new, isolated components.
- **Performance**: Ensure interactions are snappy, utilizing optimistic UI updates where appropriate (as seen in the Housing module).
