# create-workers

Start an opinioned cloudflare workers + pages project with vue 3 + vite.

# Usage

## Create Full-Stack Project (Default)

Create a complete project with Vue 3 frontend and Workers backend:

### Interactive Mode

```sh
npm create workers@latest
```

In interactive mode, you will be asked:

1. Project name
2. GitHub username
3. **Create backend-only workers project?** (new)
4. Whether to overwrite existing directory (if needed)

### Command-line Arguments Mode

```sh
npx -y create-workers@latest project-name --user=github-username
```

## Create Backend-Only Project

Create a project with only Workers backend (without Vue frontend):

### Interactive Mode

In interactive mode, select "Yes" when asked "Create backend-only workers project?":

```sh
npm create workers@latest
```

### Command-line Arguments Mode

Create directly using the `--backend` flag:

```sh
npx -y create-workers@latest project-name --backend --user=github-username
```

## Available Arguments

- `--backend`: Create backend-only project
- `--user=<username>`: Specify GitHub username
- `--force`: Force overwrite existing directory
- `--prod`: Production mode
