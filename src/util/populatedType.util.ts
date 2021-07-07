import { Types } from 'mongoose';

/**
 * This is a utility to use to typecast a document into a POPULATED document, so populated fields no longer show as just ObjectId's, but the actual object
 */
export type Populated<M, K extends keyof M> = Omit<M, K> &
	{
		[P in K]: Exclude<M[P], Types.ObjectId[] | Types.ObjectId>;
	};
