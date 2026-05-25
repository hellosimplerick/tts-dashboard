# Contributing

This is a practical TTS testing lab, not a polished vendor marketplace. Contributions are welcome!

## Adding a new provider

1. Add the provider metadata to `src/lib/types.ts` in the `PROVIDERS` array.
2. Implement two functions in `src/lib/tts/providers.ts`:
   - `synthesize{ProviderName}()` — synthesizes audio given a config
   - `list{ProviderName}Voices()` — fetches live voice list from the provider (optional, fallback to seeded voices)
3. Wire the functions into the `synthesizeTTS()` and `listProviderVoices()` dispatchers.
4. Add a security note in `README.md` under "Important implementation notes" if the provider has a quirk (auth method, region requirements, etc.).

## Fixing a provider

Providers change frequently. If a provider endpoint moves, voice format changes, or auth breaks:

1. Read the provider's API docs.
2. Update only the relevant `synthesize{Provider}()` or `list{Provider}Voices()` function.
3. Test locally before submitting.
4. Document the change in a commit message.

## Tests

No test framework is set up yet. Test manually:

```bash
npm run dev
```

Open `http://localhost:3000`, fill in an API key, and click **Fetch voices** and **Generate**.

## Code style

- Prefer clarity over cleverness.
- Keep provider adapters isolated — changes to one provider shouldn't require tweaks elsewhere.
- Use TypeScript strict mode. Types matter for multi-provider code.
- No comments unless the *why* is non-obvious.

## Commit messages

- "Add {provider} support" — new provider
- "Fix {provider} {issue}" — bug or API change
- "Update {provider} docs" — documentation only
- "Remove {provider}" — deprecation
