import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { UserService } from '../user.service';

@ValidatorConstraint({ name: 'userExistsByAddressValidator', async: true })
export class UserExistsByAddressValidator
  implements ValidatorConstraintInterface
{
  constructor(private readonly userService: UserService) {}

  async validate(address: string, args: ValidationArguments): Promise<boolean> {
    const userExists = await this.userService.findByAddress(address);

    return !Boolean(userExists);
  }

  defaultMessage(args: ValidationArguments) {
    return `User with address '${args.value}' already exists`;
  }
}
