import { MyContext } from "../types";
import { ErrorResponse } from "../utils/ErrorResponse";
import { MiddlewareFn } from "type-graphql";

export const isAuth: MiddlewareFn<MyContext> = ( { context }, next ) =>
{
    const currentUser = context.req.session!.user;

    if ( !currentUser )
    {
        throw new ErrorResponse( 'Not Authenticated', 401 );
    }
    return next();
};
