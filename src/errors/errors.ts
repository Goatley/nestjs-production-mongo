export enum Errors {
	DocumentNotFound = 'DocumentNotFound', //mongoose returned null when looking for a specific document
	ActionNotAllowed = 'ActionNotAllowed', //an action goes against business logic and is blocked
	UnableToCreate = 'UnableToCreate',
	UnableToUpdate = 'UnableToUpdate',
	Forbidden = 'Forbidden',
}

export class InsufficientPermissionError extends Error {
	code: string;

	constructor(message?: string) {
		super(message || 'You have insufficient permissions to access this resource');
		//this allows errors to reference the error name vs genereic 'Error" class in stack trace
		this.name = this.constructor.name;
		this.code = 'heeh';
	}
}

export class ActionNotAllowedError extends Error {
	code: string;

	constructor(message?: string) {
		super(message || 'This action is restricted and not allowed.');
		//this allows errors to reference the error name vs genereic 'Error" class in stack trace
		this.name = this.constructor.name;
	}
}
