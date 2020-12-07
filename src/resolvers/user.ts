import { MyContext } from "../types";
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { User } from "../entities/User";
import argon from 'argon2';
import { ErrorResponse } from "../utils/ErrorResponse";
import { isAuth } from "../middlewares/customErrors";

@Resolver( User )
export class UserResolver
{
    @FieldResolver( () => String )
    email
        (
            @Root()
            user: User,

            @Ctx()
            { req }: MyContext
        )
    {
        const currentUser = req.session!.user;
        if ( currentUser === user.id )
        {
            return user.email;
        }
        return '';
    }

    @Query( () => User, { nullable: true } )
    @UseMiddleware( isAuth )
    async getMe (
        @Ctx() { req }: MyContext
    )
    {
        const currentUser = req.session!.user;

        const user = await User.findOne( currentUser );

        return user;
    }

    @Mutation( () => Boolean, { nullable: true } )
    @UseMiddleware( isAuth )
    async logout (
        @Ctx() { req }: MyContext,
    )
    {
        req.session!.destroy( ( err ) =>
        {
            if ( err )
            {
                console.error( err );
            }
        } );
        return true;
    }

    @Mutation( () => User )
    async register
        (
            @Ctx() { req }: MyContext,

            @Arg( 'name', () => String )
            name: string,

            @Arg( 'email', () => String )
            email: string,

            @Arg( 'password', () => String )
            password: string

        ): Promise<User | null>
    {
        if ( req.session!.user )
        {
            throw new ErrorResponse( 'Not Authorized', 401 );
        }

        if ( password.length < 8 || password.length > 16 )
        {
            throw new ErrorResponse( 'Password must be 8 to 16 characters long', 401 );
        }

        const hashPassword = await argon.hash( password );

        try
        {
            const user = await User.create( { name, email, password: hashPassword } ).save();

            req.session!.user = user.id;

            return user;
        } catch ( err )
        {
            console.error( err );
            if ( err.code === '23505' )
            {
                throw new ErrorResponse( 'Email is already taken', 401 );
            }
        }
        return null;
    }

    @Mutation( () => User, { nullable: true } )
    async login
        (
            @Ctx() { req }: MyContext,

            @Arg( 'email', () => String )
            email: string,

            @Arg( 'password', () => String )
            password: string

        ): Promise<User | ErrorResponse>
    {
        if ( req.session!.user )
        {
            throw new ErrorResponse( 'Not Authorized', 401 );
        }

        const user = await User.findOne( { email } );
        if ( !user )
        {
            throw new ErrorResponse( 'Invalid Credentials', 401 );
        }

        const isValidPassword = await argon.verify( user.password, password );

        if ( !isValidPassword )
        {
            throw new ErrorResponse( 'Invalid Credentials', 401 );
        }

        req.session!.user = user.id;

        return user;
    }
}