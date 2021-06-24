export enum Errors {
    DocumentNotFound = 'DocumentNotFound', //mongoose returned null when looking for a specific document
    ActionNotAllowed = 'ActionNotAllowed', //an action goes against business logic and is blocked
    UnableToCreate = 'UnableToCreate',
    UnableToUpdate = 'UnableToUpdate',
    Forbidden = 'Forbidden',
}
