import { ObjectType } from "type-graphql";
import
{
    Entity,
    Column,
    BaseEntity,
    ManyToOne,
    PrimaryColumn,
} from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

// many to many
// users <-Upvote(join table)-> posts

@ObjectType()
@Entity()
export class Upvote extends BaseEntity
{
    @Column( { type: 'int' } )
    value: number;

    @ManyToOne( () => User, user => user.upvotes )
    user: User;

    @ManyToOne( () => Post, post => post.upvotes )
    post: Post;

    @PrimaryColumn()
    userId: number;

    @PrimaryColumn()
    postId: number;

}