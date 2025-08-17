interface AuthUser {
    id: number,
    name: string,
    email: string

}
// declare tells TypeScript “This exists, but don’t compile it — just trust me.”

declare namespace Express {
    export interface Request {
        user?: AuthUser
    }
}