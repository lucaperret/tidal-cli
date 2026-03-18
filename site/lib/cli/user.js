"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfileData = getUserProfileData;
exports.getUserProfile = getUserProfile;
const auth_1 = require("./auth");
async function getUserProfileData(client) {
    const { data, error } = await client.GET('/users/me', {
        params: {},
    });
    if (error || !data) {
        throw new Error(`Failed to get user profile — ${JSON.stringify(error)}`);
    }
    const attrs = data.data?.attributes ?? {};
    return {
        id: data.data?.id,
        username: attrs.username,
        country: attrs.country,
        email: attrs.email,
    };
}
async function getUserProfile(json) {
    const client = await (0, auth_1.getApiClient)();
    try {
        const result = await getUserProfileData(client);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nUser profile:');
        if (result.id)
            console.log(`  ID: ${result.id}`);
        if (result.username)
            console.log(`  Username: ${result.username}`);
        if (result.country)
            console.log(`  Country: ${result.country}`);
        if (result.email)
            console.log(`  Email: ${result.email}`);
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=user.js.map