import { getApiClient } from './auth';
import type { UserProfile } from './types';
export type { UserProfile };

export async function getUserProfileData(client: any): Promise<UserProfile> {
  const { data, error } = await client.GET('/users/me' as any, {
    params: {},
  });

  if (error || !data) {
    throw new Error(`Failed to get user profile — ${JSON.stringify(error)}`);
  }

  const attrs = (data as any).data?.attributes ?? {};
  return {
    id: (data as any).data?.id,
    username: attrs.username,
    country: attrs.country,
    email: attrs.email,
  };
}

export async function getUserProfile(json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await getUserProfileData(client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('\nUser profile:');
    if (result.id) console.log(`  ID: ${result.id}`);
    if (result.username) console.log(`  Username: ${result.username}`);
    if (result.country) console.log(`  Country: ${result.country}`);
    if (result.email) console.log(`  Email: ${result.email}`);
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
