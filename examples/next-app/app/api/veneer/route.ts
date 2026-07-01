import { createVeneerRouteHandler } from '@veneer/next';

import veneerConfig from '../../../veneer.config.js';

//Build the handler once when this module first loads.
//The handler fills in defaults and checks the config for you.
const { POST: handlePost } = createVeneerRouteHandler(veneerConfig);

//This route needs the Node runtime because it talks to Postgres.
export const runtime = 'nodejs';

export const POST = handlePost;
