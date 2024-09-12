import { Inject, Service } from "typedi";
import { IGamesDTO } from "../dtos";
import Game from "../database/typeorm/entities/Game";
import IGamesRepository from "../repositories/IGamesRepository";
import IUsersRepository from "../../users/repositories/IUsersRepository";
import User, { UserAccess } from "../../users/database/typeorm/entities/User";
import ApiError from "../../../infra/errors/ApiError";

type IRequest = {
  userId: string;
  gameId: string;
  homeScore?: number;
  visitorScore?: number;
};

@Service()
export default class UpdateGamesService {
  constructor(
    @Inject("typeorm.usersRepository")
    private usersRepository: IUsersRepository,

    @Inject("typeorm.gamesRepository")
    private gamesRepository: IGamesRepository
  ) {}

  private getHomeScore(oldScore: number, score?: number): number {
    const homeScore = typeof score === "undefined" ? oldScore : score;

    return homeScore;
  }

  private getVisitorScore(oldScore: number, score?: number): number {
    const visitorScore = typeof score === "undefined" ? oldScore : score;

    return visitorScore;
  }

  private getLoggedUser(userId: string): Promise<User | undefined> {
    return this.usersRepository.findById(userId);
  }

  private loggedUserCanUpdateGames(user?: User): boolean {
    if (!user) return false;

    const userHasRightToAccess = user.access === UserAccess.ADMIN;

    return userHasRightToAccess;
  }

  private isGameScoreDraw(leftScore: number, rightScore: number): boolean {
    return leftScore === rightScore;
  }

  private async updateNextGame(
    game: Game,
    homeScore: number,
    visitorScore: number
  ): Promise<void> {
    const draw = this.isGameScoreDraw(homeScore, visitorScore);
    const oddGame = game.cardinal % 2 !== 0;
    const winnerPlace = oddGame ? "home" : "visitor";

    if (draw) {
      await this.gamesRepository.update(game, { [winnerPlace]: null });
    }

    const winner = homeScore > visitorScore ? game.home : game.visitor;

    await this.gamesRepository.update(game, { [winnerPlace]: winner });
  }

  public async execute(data: IRequest): Promise<Game> {
    const user = await this.getLoggedUser(data.userId);
    const userCanUpdateGames = this.loggedUserCanUpdateGames(user);

    if (!userCanUpdateGames) {
      throw new ApiError("Você não tem permissão para realizar esta operação!");
    }

    const game = await this.gamesRepository.findById(data.gameId);

    if (!game) {
      throw new ApiError("Não foi possível atualizar esse registro!");
    }

    const homeScore = this.getHomeScore(game.home_score, data.homeScore);
    const visitorScore = this.getVisitorScore(
      game.visitor_score,
      data.visitorScore
    );
    const draw = this.isGameScoreDraw(homeScore, visitorScore);

    const nextGame = await this.gamesRepository.getNextGame(game);

    if (nextGame) this.updateNextGame(nextGame, homeScore, visitorScore);

    if (draw || !nextGame) {
      return this.gamesRepository.update(game, {
        visitorScore,
        homeScore,
      });
    }

    await this.gamesRepository.update(game, data);

    const updatedGame = (await this.gamesRepository.findById(game.id)) as Game;

    return updatedGame;
  }
}
