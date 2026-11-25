import { createAuth } from "@tripo/auth";
import { createDb } from "@tripo/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
