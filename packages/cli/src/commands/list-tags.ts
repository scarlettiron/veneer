import { createVeneerServerFromConfig } from '@veneer/server';

//Prints every tag in the database.
export const runListTags = async (flags: Record<string, string>): Promise<number> => {
  const server = await createVeneerServerFromConfig({ path: flags.config });

  try {
    const tags = await server.db.listTags();

    if (tags.length === 0) {
      console.log('There are no tags yet.');

      return 0;
    }

    console.log(`${tags.length} tag${tags.length === 1 ? '' : 's'}:`);

    for (const tag of tags) {
      console.log(`  ${tag}`);
    }

    return 0;
  } finally {
    await server.close();
  }
};
