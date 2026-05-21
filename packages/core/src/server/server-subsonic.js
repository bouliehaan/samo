export const getSubsonicUser = async (fetcher, baseUrl, credential, username) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        username,
        v: '1.13.0',
    });
    const response = await fetcher(`${baseUrl}/rest/getUser.view?${params.toString()}&${credential}`);
    if (!response.ok) {
        throw new Error(`Subsonic user check failed (${response.status})`);
    }
    const body = (await response.json());
    const subsonic = body['subsonic-response'];
    if (subsonic?.status !== 'ok') {
        throw new Error(subsonic?.error?.message ?? 'Subsonic user check did not return ok');
    }
    return subsonic;
};
