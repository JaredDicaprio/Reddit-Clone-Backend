import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { Arg, Ctx, Field, FieldResolver, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { isAuth } from "../middlewares/customErrors";
import { ErrorResponse } from "../utils/ErrorResponse";
import { getConnection } from "typeorm";
import { Upvote } from "../entities/Upvote";
import { User } from "../entities/User";

@ObjectType()
export class PaginatedPosts
{
    @Field( () => [ Post ] )
    posts: Post[];
    @Field()
    hasMore: boolean;
}

@Resolver( Post )
export class PostResolver
{

    @FieldResolver( () => User )
    creator
        (
            @Root()
            post: Post,

            @Ctx()
            { creatorLoader }: MyContext
        )
    {
        return creatorLoader.load( post.creatorId );
    }

    @FieldResolver( () => Int )
    @UseMiddleware( isAuth )
    async voteStatus
        (
            @Root()
            post: Post,

            @Ctx()
            { voteLoader, req }: MyContext
        )
    {
        const currentUser = req.session!.user;
        const loadedVote = await voteLoader.load( { postId: post.id, userId: currentUser } );
        return loadedVote ? loadedVote.value : null;
    }

    @Query( () => PaginatedPosts )
    async posts ( @Ctx() { }: MyContext, @Arg( 'limit', () => Int ) limit: number, @Arg( 'cursor', () => String, { nullable: true } ) cursor: string | null ): Promise<PaginatedPosts>
    {
        const realLimit = Math.min( 50, limit );
        const reaLimitPlusOne = realLimit + 1;

        const replacements: any[] = [ reaLimitPlusOne ];

        if ( cursor )
        {
            replacements.push( new Date( parseInt( cursor ) ) );
        }

        const posts: Post[] = await getConnection().query(
            `
                SELECT p.*
                FROM post p
                ${ cursor ? `WHERE p."createdAt" < $2` : "" }
                ORDER BY p."createdAt" DESC
                LIMIT $1
    `,
            replacements
        );
        return {
            posts,
            hasMore: posts.length === reaLimitPlusOne
        };
    }

    @Query( () => Post, { nullable: true } )
    post (
        @Ctx()
        { }: MyContext,

        @Arg( 'id', () => Int )
        id: number ): Promise<Post | undefined>
    {
        return Post.findOne( id );
    }

    @Mutation( () => Post, { nullable: true } )
    @UseMiddleware( isAuth )
    async createPost
        (
            @Ctx()
            { req }: MyContext,

            @Arg( 'title' )
            title: string,

            @Arg( 'text' )
            text: string

        ): Promise<Post | null>
    {
        const currentUser = req.session!.user;
        try
        {
            const post = await Post.create( { title, text, creatorId: currentUser } ).save();
            return post;
        } catch ( err )
        {
            console.error( err );
            if ( err.code === '23505' )
            {
                throw new ErrorResponse( 'Post with this title already exists', 401 );
            }
        }
        return null;
    }

    @Mutation( () => Boolean )
    @UseMiddleware( isAuth )
    async deletePost
        (
            @Ctx()
            { req }: MyContext,

            @Arg( 'id' )
            id: number

        ): Promise<Boolean>
    {
        const currentUser = req.session!.user;
        const post: Post | undefined = await Post.findOne( id );
        if ( !post )
        {
            return false;
        }
        if ( post.creatorId !== currentUser )
        {
            throw new ErrorResponse( 'Not Authorized', 401 );
        }
        Post.delete( id );
        return true;
    }

    @Mutation( () => Boolean )
    @UseMiddleware( isAuth )
    async updatePost
        (
            @Ctx()
            { req }: MyContext,

            @Arg( 'id' )
            id: number,

            @Arg( 'title', { nullable: true } )
            title: string,

    ): Promise<Boolean>
    {
        const currentUser = req.session!.user;
        const post: Post | undefined = await Post.findOne( id );
        if ( !post )
        {
            return false;
        }
        if ( post.creatorId !== currentUser )
        {
            throw new ErrorResponse( 'Not Authorized', 401 );
        }
        Post.update( id, { title } );
        return true;
    }

    @Mutation( () => Boolean )
    @UseMiddleware( isAuth )
    async vote (
        @Arg( 'postId', () => Int )
        postId: number,

        @Arg( 'value', () => Int )
        value: number,

        @Ctx()
        { req }: MyContext
    )
    {
        const isUpvote = value === 1;
        const userId = req.session!.user;
        const votePoint = isUpvote ? 1 : -1;

        const upvote = await Upvote.findOne( { where: { postId, userId } } );

        if ( upvote && upvote.value === votePoint )
        {
            throw new ErrorResponse( 'You can up/down vote only +1/-1 at a time', 401 );
        }

        else if ( upvote && votePoint !== upvote.value )
        {
            await getConnection().transaction( async tn =>
            {
                await tn.query( `
                UPDATE upvote
                SET value = ${ votePoint }
                WHERE "postId" = ${ postId }
                AND "userId" = ${ userId }
                `);


                await tn.query( `
                    UPDATE post
                    SET points = points + ${ votePoint }
                    WHERE "id" = ${ postId };
                `);

            } );
        }
        else //  ( !upvote )
        {
            await getConnection().transaction( async tn =>
            {
                await tn.query( `
                    INSERT INTO upvote ("userId", "postId", value)
                    values (${ userId }, ${ postId }, ${ value });
                `);

                await tn.query( `
                    UPDATE post
                    SET points = points + ${ votePoint }
                    WHERE "id" = ${ postId };
                `);
            } );
        }

        return true;
    }


}