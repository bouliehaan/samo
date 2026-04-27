export interface AudiobookshelfLoginResponse {
    user: {
        id: string;
        token: string;
        type?: string;
        username: string;
    };
}
