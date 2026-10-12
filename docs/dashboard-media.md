# Dashboard media — October 12

Built-in image generation was used. No API key, paid integration or new hosted service was added to SBO. Generated originals were preserved under .local/dashboard-sources/. Lightweight WebP encodings are served directly, with no per-request image processing or external image service.

The five cards use DashboardArt: card-image-layer, card-overlay-layer and card-gradient-fade. Media stays on the visual left; content occupies an opaque column on the right. Work/Tasks are the upper pair, Water/Nutrition the compact pair, Car the full-width lower card. Water/Nutrition images use 30% of the card, others 32–36%.

Vehicle keeps the existing Mazda image composition in public/overview-car.webp; public/mazda-3-black.png remains unchanged. New assets and their generation prompts:

## public/overview-work.webp

Use case: product-mockup. Asset type: dedicated decorative photograph for the Work card in a dark Hebrew personal dashboard. Create one vertical 2:3 image, photorealistic restrained premium matte still life: a slim black leather briefcase beside a closed dark laptop and one elegant pen on a clean midnight navy desk. No humans, no faces, no text, no logos, no lettering, no UI or cards. Composition: all key objects fully visible with generous breathing room, concentrated toward the left and middle, viewed at a shallow three-quarter angle, deep navy negative space at right. Soft cool light with tiny warm gold highlights, low contrast background, rich realistic materials, no bright stock photography. The whole object silhouette must read when this photograph is displayed in a narrow card media column; avoid extreme close crops. Background color near #092b3d. Actual app metrics will be rendered separately.

## public/overview-water.webp

Use case: product-mockup. Asset type: decorative photograph for compact Water dashboard card. Create one vertical 2:3 premium photorealistic product image of one elegant smoky blue reusable water bottle, entire bottle and cap fully inside the frame with breathing room, standing on a matte dark navy surface. Bottle positioned left of center with clean negative space on the right; calm subtle water reflections, a few understated droplets. Dark matte editorial studio mood, soft cool light, no bright highlights, no busy water splash, no people, no hands, no text, no labels, no logos, no UI. Background close to #092b3d. The silhouette should remain clear in a narrow dashboard media column.

## public/overview-nutrition.webp

Use case: product-mockup. Asset type: decorative photograph for compact Nutrition dashboard card. Create one vertical 2:3 image, photorealistic premium minimal still life: a small matte dark ceramic plate containing a restrained composition of grilled chicken, two broccoli florets and a small portion of rice, plus a few minimal natural ingredients on a deep midnight navy tabletop. Keep the whole plate clearly visible with generous space around it, no giant close crop, no clutter, no hands or people, no text, no logos, no UI. Top-down/slightly elevated composition with plate slightly toward left center and clean empty navy space to the right. Subtle cool light and small warm highlights, muted appetizing colors, matte editorial finish. Background near #092b3d; the app will overlay the fade only inside the image column.

## public/overview-tasks.webp

Use case: product-mockup. Asset type: dedicated decorative Tasks and Time Management dashboard photograph. One vertical 2:3 premium editorial still life of a closed matte black leather planner/notebook with one restrained gold-metal pen laid beside it and a simple small unbranded dark desk clock, on a clean midnight navy desk. Entire notebook and pen visible with comfortable margins, concentrated left of center, no close crop. Quiet shallow three-quarter angle. Muted cool lighting, tiny warm highlights, matte elegant professional finish, no people, no faces, no text, no lettering, no logos, no UI. Deep navy negative space on the right, background near #092b3d. This picture supports metrics rendered separately and should read at small scale.
