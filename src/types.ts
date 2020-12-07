import { Request, Response } from 'express';
import { creatorLoader, voteLoader } from './utils/dataLoaders';

export type MyContext = {
    req: Request;
    res: Response;
    creatorLoader: ReturnType<typeof creatorLoader>;
    voteLoader: ReturnType<typeof voteLoader>;
};