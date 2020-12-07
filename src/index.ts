import 'reflect-metadata';
import { createConnection } from 'typeorm';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { Post } from './entities/Post';
import { User } from './entities/User';
import { Upvote } from './entities/Upvote';
import { UserResolver } from './resolvers/user';
import { __prod__ } from './utils/constants';
import dotenv from 'dotenv';
import 'colors';
import { errorHandler } from './middlewares/errorHandler';
import session from 'express-session';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';
import cors from 'cors';
import { creatorLoader, voteLoader } from './utils/dataLoaders';

const main = async () =>
{
    const RedisClient = new Redis( {
        port: 6379,
        host: process.env.REDIS_HOST || '127.0.0.1'
    } );
    const RedisStore = connectRedis( session );

    dotenv.config( { path: 'config.env' } );

    await createConnection( {
        type: 'postgres',
        database: 'reddit-clone',
        username: process.env.POSTGRES_USERNAME,
        password: process.env.POSTGRES_PASSWORD,
        logging: true,
        synchronize: true,
        entities: [ Post, User, Upvote ],
        host: process.env.DB_HOST || 'localhost',
    } );

    console.log( `Postgres with typeorm is here`.blue.bold );

    const app = express();

    app.set( 'true proxy', 1 );

    app.use( cors( {
        credentials: true,
        origin: process.env.CLIENT_URL
    } ) );


    app.get( '/', ( _, res ) =>
    {
        res.send( 'API up and running' );
    } );

    app.use(
        session( {
            store: new RedisStore( { client: RedisClient } ),
            name: 'quid',
            secret: process.env.SESSION_SECRET!,
            resave: false, // no revival
            saveUninitialized: false, // dont save until the cookie is generated
            cookie: {
                httpOnly: true,
                sameSite: 'lax',
                secure: __prod__,
                maxAge: 1000 * 60 * 60 * 24, // 1 day
            },
        } ),
    );


    const apolloServer = new ApolloServer( {
        schema: await buildSchema( {
            resolvers: [ HelloResolver, PostResolver, UserResolver ],
            validate: false
        } ),
        context: ( { req, res } ) => ( { req, res, creatorLoader: creatorLoader(), voteLoader: voteLoader() } )
    } );

    apolloServer.applyMiddleware( { app, cors: false } );

    app.use( errorHandler );

    const PORT = process.env.PORT || 5000;
    app.listen( PORT, () =>
    {
        console.log( `Server started on port ${ PORT }`.green.bold );
    } );
};

main().catch( err => console.error( err ) );