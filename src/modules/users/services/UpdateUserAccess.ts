import { Inject, Service } from "typedi";
import IUsersRepository from "../repositories/IUsersRepository";
import User, { UserAccess } from "../database/typeorm/entities/User";
import ApiError from "../../../infra/errors/ApiError";

interface IRequest {
  userId: string;
  loggedUserId: string;
  access: UserAccess;
}

@Service()
export default class UpdateUserAccess {
  constructor(
    @Inject('typeorm.usersRepository')
    private usersRepository: IUsersRepository,
  ) {}

  private validateRequestedAccess(requestedAccess: UserAccess): boolean {
    const validAccesses = [1, 2];

    const requestedAccessIsValid = validAccesses.some(
      access => access === requestedAccess
    );

    return requestedAccessIsValid;
  }

  private async getLoggedUser(userId: string): Promise<User | undefined> {
    return this.usersRepository.findById(userId);
  }

  private checkLoggedUserAccess(access: UserAccess): boolean {
    return access === UserAccess.ADMIN;
  }

  public async execute(data: IRequest): Promise<User> {
    const requestedAccessIsValid = this.validateRequestedAccess(data.access);

    if (!requestedAccessIsValid) throw new ApiError('Invalid access!');

    const loggedUser = await this.getLoggedUser(data.loggedUserId);

    if (!loggedUser) throw new ApiError('Could not found logged user!', 401);

    const loggedUserHasAccess = this.checkLoggedUserAccess(
      loggedUser.access
    );

    if (!loggedUserHasAccess) {
      throw new ApiError('Action not authorized!');
    }

    const userToUpdate = await this.usersRepository.findById(
      data.userId,
    );

    if (!userToUpdate) {
      throw new ApiError('Could not find user to grant privileges!');
    }

    const updatedUser = await this.usersRepository.update(
      userToUpdate,
      { access: data.access }
    );

    return updatedUser;
  }
}
