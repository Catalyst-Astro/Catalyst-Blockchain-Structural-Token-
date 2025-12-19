# Copilot Instructions for My Project

## Overview
This project is structured to facilitate a clear separation of concerns, with the main application logic in `src/app.ts` and type definitions in `src/types/index.ts`. Understanding the flow of data and the roles of different components is crucial for effective contributions.

## Architecture
- **Main Application Logic**: Located in `src/app.ts`, this file initializes the application and handles core functionality.
- **Type Definitions**: All TypeScript types and interfaces are defined in `src/types/index.ts`, promoting type safety across the codebase.

## Developer Workflows
- **Building the Project**: Use the command `npm run build` to compile TypeScript files based on the configuration in `tsconfig.json`.
- **Running the Application**: Execute `npm start` to run the application in development mode.
- **Testing**: Ensure to run tests using `npm test`, which is configured in the `package.json` file.

## Project-Specific Conventions
- **Type Safety**: Always define types for function parameters and return values in `src/types/index.ts` to maintain clarity and prevent runtime errors.
- **File Structure**: Keep the `src` directory organized by functionality, with separate folders for different components if the project scales.

## Integration Points
- **External Dependencies**: Review `package.json` for a list of dependencies. Ensure to install any new dependencies using `npm install`.
- **Cross-Component Communication**: Use the defined types in `src/types/index.ts` to ensure consistent data structures are used across different components.

## Examples
- When adding a new feature, define the necessary types in `src/types/index.ts` first, then implement the logic in `src/app.ts`.
- Follow the existing patterns in `src/app.ts` for initializing middleware and routes to maintain consistency.

Please review this updated `.github/copilot-instructions.md` and let me know if there are any unclear or incomplete sections that need further iteration.