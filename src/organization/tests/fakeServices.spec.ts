//fake services here
export class OrganizationServiceFake {
	public async create(): Promise<void> {}
	public async findOne(): Promise<void> {}
	public async findAll(): Promise<void> {}
	public async update(): Promise<void> {}
	public async remove(): Promise<void> {}
}

export class OrganizationUserServiceFake {
	public async findAll(): Promise<void> {}
	public async update(): Promise<void> {}
	public async remove(): Promise<void> {}
}

export class OrganizationAdminServiceFake {
	public async findAll(): Promise<void> {}
	public async update(): Promise<void> {}
	public async remove(): Promise<void> {}
}

//creating fake mongoose documents and their utilized methods
export class OrganizationDocumentFake {}

export class UserDocumentFake {}
