import { ROLES } from '@veneer/core';
import { createVeneerServerFromConfig } from '@veneer/server';

//Creates a new user, defaulting to the superuser role.
//Use this once to make your first superuser, who can then create tags.
export const runCreateSuperuser = async (flags: Record<string, string>): Promise<number> => {
  const email = flags.email;
  const password = flags.password;

  if (!email || !password) {
    console.error('Both --email and --password are required.');

    return 1;
  }

  //Allow making an editor too, but default to superuser since that is the common case.
  const role = flags.role === ROLES.EDITOR ? ROLES.EDITOR : ROLES.SUPERUSER;

  const server = await createVeneerServerFromConfig({ path: flags.config });

  try {
    const actor = await server.auth.createUser(email, password, role);
    console.log(`Created ${role} "${email}" with id ${actor.userId}.`);

    return 0;
  } finally {
    await server.close();
  }
};
