# How to contribute

We welcome contributions to the project!

If you have an idea for a new feature, or have found a bug, please open an issue to discuss it.

## Development

To set up a development environment, follow these steps:


> [!IMPORTANT]
>  You will need to have the frontend and an authentication service running locally to test your changes.
> Please refer to the [frontend repository](https://github.com/Oghamark/homebranch-web) and the [auth repository](https://github.com/Oghamark/Authentication)
> or our [documentation](https://homebranch.app/docs/getting-started/) for instructions on how to set up the backend.

1. [Fork](https://help.github.com/articles/fork-a-repo/) the repository
   and [clone](https://help.github.com/articles/cloning-a-repository) it to your local machine.
2. Add the remote upstream repository:
    ```bash
    git remote add upstream https://github.com/Oghamark/homebranch.git
    ```
3. Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b my-feature-branch dev
    ```
4. install dependencies
```bash
    npm i
```
```
```
5. Run the development server:
    ```bash
    npm run start:dev
    ```
6. Make your changes and commit them with descriptive messages.
7. Write tests for your changes if applicable, and ensure all tests pass before submitting your pull request.
8. Push your changes to your fork:
    ```bash
    git push origin my-feature-branch
    ```
9. Open a pull request against the `dev` branch of the original repository.

## Contributing Code of Conduct

- If you are contributing to an existing issue, please comment on the issue to let others know you are working on it.
- If you are opening a new issue, please provide as much detail as possible, including steps to reproduce the issue, screenshots, and any relevant logs.
- When submitting a pull request, please include a clear description of the changes you have made and the problem they solve. If your pull request addresses an existing issue, please reference the issue number in your description (e.g., "Fixes #123").
- Please ensure your code follows the project's coding style.
