# October 19 feedback

Overview media fills the left half of each tile using cover cropping and a confined fade. Metrics remain in the right half; mobile nutrition labels and license plates stay inside their content column. Existing portrait image assets are reused.

Settings cancellation discards the pending profile/photo/password/display edits and returns to the settings categories. Reminder cancellation resets its form and closes the containing dialog or section. Profile photo selection uses one explicit button with a short size hint. Notifications are removed from settings; old settings notification links redirect to the independent notification screen.

Vehicle UI removes the duplicate module reminder panel and advanced refueling section. Estimated range is labeled `טווח קילומטר ממוצע`, followed by `קילומטר בפועל`, then the full-tank control. The source selector, Trip A instructions and first-full baseline badge are removed. The manufacturer badge occupies a separate column to the right of the vehicle picture; reminder text and toggle have a visible gap.

Typing actual distance explicitly records a manual measurement for its full-to-full interval. Estimated range does not enter consumption calculations. Confirmed historical measurements and hidden odometer/dashboard values are retained when editing unrelated details. An unconfirmed historical measurement cannot become confirmed through an unrelated edit. Clearing a previously confirmed actual-distance field invalidates that calculation. No database schema change or deletion of historical data is required.

Verification: 12 fuel-cycle unit tests passed; TypeScript passed; browser checks cover cancellation without persistence, removed duplicate controls, old notification URL redirect, image/content separation, badge/toggle spacing, exact refueling field order, and full-to-full save/clear/history behavior. Responsive widths: 320, 390, 597, 834 and 1440px; the existing V6 layout scenario additionally checks 360, 375, 430, 1024, 1194 and 200% text. Screenshots are local test artifacts and are not published with private user data.
