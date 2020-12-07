import DataLoader from "dataloader";
import { Upvote } from "../entities/Upvote";
import { User } from "../entities/User";

export const creatorLoader = () =>
{
    return new DataLoader<number, User>( async ( ids ) =>
    {
        const users = await User.findByIds( ids as number[] );
        const usersWithIds: Record<number, User> = {};
        users.forEach( user => usersWithIds[ user.id ] = user );

        return ids.map( id => usersWithIds[ id ] );
    } );
};

export const voteLoader = () =>
{
    return new DataLoader<{ postId: number, userId: number; }, Upvote>( async keys =>
    {
        const votes = await Upvote.findByIds( keys as any );
        const idsToVotes: Record<string, Upvote> = {};
        votes.forEach( vote => idsToVotes[ `${ vote.userId }|${ vote.postId }` ] = vote );

        const refilledVotes = keys.map( key => idsToVotes[ `${ key.userId }|${ key.postId }` ] );

        return refilledVotes;
    } );
};