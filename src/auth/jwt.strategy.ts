import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { IUserToken } from '../user/interfaces/user.interface';
import * as mongoose from 'mongoose';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor() {
		super({
			secretOrKeyProvider: passportJwtSecret({
				cache: true,
				rateLimit: true,
				jwksRequestsPerMinute: 5,
				jwksUri: `${process.env.AUTH0_ISSUER_URL}.well-known/jwks.json`,
			}),

			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			audience: process.env.AUTH0_AUDIENCE,
			issuer: `${process.env.AUTH0_ISSUER_URL}`,
			algorithms: ['RS256'],
		});
	}

	validate(payload: unknown): unknown {
		const user: IUserToken = {
			_id: mongoose.Types.ObjectId(payload['sub'].substr(6)),
			email: payload['https://goatit.tech/email'],
			permissions: payload['permissions'],
		};

		return user;
	}
}
