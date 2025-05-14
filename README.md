# Mantine Next.js template

This is a template for [Next.js](https://nextjs.org/) app router + [Mantine](https://mantine.dev/).
If you want to use pages router instead, see [next-pages-template](https://github.com/mantinedev/next-pages-template).

## Features

This template comes with the following features:

- [PostCSS](https://postcss.org/) with [mantine-postcss-preset](https://mantine.dev/styles/postcss-preset)
- [TypeScript](https://www.typescriptlang.org/)
- [Storybook](https://storybook.js.org/)
- [Jest](https://jestjs.io/) setup with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- ESLint setup with [eslint-config-mantine](https://github.com/mantinedev/eslint-config-mantine)

## Property Data Enrichment Script

Located in `public/scripts/find_matches.py`, this Python script enriches property data from Redfin with ownership information using the RentCast API.

### Features
- Reads recently sold properties from a Redfin CSV export
- Fetches ownership details via RentCast API
- Outputs an enriched CSV with combined property and ownership data
- Includes rate limiting to respect API constraints

### Input Format
The script expects a Redfin CSV export containing:
- Property addresses
- Sale dates
- Price information
- Property details (beds, baths, etc.)

### Output Format
Generates `enriched_properties.csv` with:
- Owner name
- Formatted address
- Sale price
- Sale date

### Usage
1. Place your Redfin export CSV in the `public/scripts` directory - this can be grabbed from redfin
   * [Google Docs](https://docs.google.com/spreadsheets/d/10eEJL_tCFNPjhfVF7INEv4o183u-qucPa49TGdUACEQ/edit?gid=1229770531#gid=1229770531)
   * [Redfin](https://www.redfin.com/city/15045/UT/Park-City/filter/property-type=house,min-price=2.5M,include=sold-6mo?utm_source=google&utm_medium=ppc&utm_term=kwd-337197914089&utm_content=456627126717&utm_campaign=1024451&gclid=CjwKCAjw24vBBhABEiwANFG7ywqPQdHpAN5-y_4_XoE46fWVKz0uqN_3D1aQlerJM1AV5bn0zeHjKBoCV9UQAvD_BwE)
2. Update the `CSV_FILE` path if needed
3. Ensure your RentCast API key is configured
4. Run the script:
   ```bash
   python find_matches.py
   ```

## npm scripts

### Build and dev scripts

- `dev` – start dev server
- `build` – bundle application for production
- `analyze` – analyzes application bundle with [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

### Testing scripts

- `typecheck` – checks TypeScript types
- `lint` – runs ESLint
- `prettier:check` – checks files with Prettier
- `jest` – runs jest tests
- `jest:watch` – starts jest watch
- `test` – runs `jest`, `prettier:check`, `lint` and `typecheck` scripts

### Other scripts

- `storybook` – starts storybook dev server
- `storybook:build` – build production storybook bundle to `storybook-static`
- `prettier:write` – formats all files with Prettier



