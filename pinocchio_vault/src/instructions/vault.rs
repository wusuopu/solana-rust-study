use pinocchio::{AccountView, Address, ProgramResult, cpi::{Seed, Signer}, error::ProgramError};
use pinocchio_system::instructions::Transfer;

pub struct DepositAccounts<'a> {
    pub owner: &'a AccountView,
    pub vault: &'a AccountView,
}

impl<'a> TryFrom<&'a [AccountView]> for DepositAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountView]) -> Result<Self, Self::Error> {
        let [owner, vault, _] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        if !owner.is_signer() {
            return Err(ProgramError::InvalidAccountOwner);
        }
        if !vault.owned_by(&pinocchio_system::ID) {
            return Err(ProgramError::InvalidAccountOwner);
        }
        if vault.lamports().ne(&0) {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        let owner_key = owner.address();
        let seeds: &[&[u8]] = &[b"vault", owner_key.as_ref()];
        let (vault_key, _) = Address::find_program_address(seeds, &crate::ID);
        if vault.address().ne(&vault_key) {
            return Err(ProgramError::InvalidAccountOwner);
        }
        Ok(Self { owner, vault })
    }
}

pub struct DepositInstructinData {
    pub amount: u64,
}
impl<'a> TryFrom<&'a [u8]> for DepositInstructinData {
    type Error = ProgramError;

    fn try_from(data: &'a [u8]) -> Result<Self, Self::Error> {
        if data.len() != size_of::<u64>() {
            return Err(ProgramError::InvalidInstructionData);
        }
        let amount = u64::from_le_bytes(data.try_into().unwrap());
        if amount.eq(&0) {
            return Err(ProgramError::InvalidInstructionData);
        }

        Ok(Self { amount })
    }
}

pub struct Deposit<'a> {
    pub accounts: DepositAccounts<'a>,
    pub instruction_data: DepositInstructinData,
}
impl<'a> TryFrom<(&'a [u8], &'a [AccountView])> for Deposit<'a> {
    type Error = ProgramError;

    fn try_from((data, accounts): (&'a [u8], &'a [AccountView])) -> Result<Self, Self::Error> {
        let instruction_data = DepositInstructinData::try_from(data)?;
        let accounts = DepositAccounts::try_from(accounts)?;
        Ok(Self { accounts, instruction_data })
    }
}

impl<'a> Deposit<'a>  {
    pub const DISCRIMINATOR: &'a u8 = &0;

    pub fn process(&mut self) -> ProgramResult {
        Transfer {
            from: self.accounts.owner,
            to: self.accounts.vault,
            lamports: self.instruction_data.amount,
        }.invoke()?;
        Ok(())
    }
}

// =============================================
pub struct WithdrawAccounts<'a> {
    pub owner: &'a AccountView,
    pub vault: &'a AccountView,
    pub bumps: [u8; 1],
}
impl<'a> TryFrom<&'a [AccountView]> for WithdrawAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountView]) -> Result<Self, Self::Error> {
        let [owner, vault, _] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        if !owner.is_signer() {
            return Err(ProgramError::InvalidAccountOwner);
        }
        if !vault.owned_by(&pinocchio_system::ID) {
            return Err(ProgramError::InvalidAccountOwner);
        }
        if vault.lamports().eq(&0) {
            return Err(ProgramError::InvalidAccountData);
        }
        let seeds: &[&[u8]] = &[b"vault", owner.address().as_ref()];
        let (vault_key, bump) = Address::find_program_address(seeds, &crate::ID);
        if vault.address().ne(&vault_key) {
            return Err(ProgramError::InvalidAccountOwner);
        }
        Ok(Self { owner, vault, bumps: [bump] })
    }
}

pub struct Withdraw<'a> {
    pub accounts: WithdrawAccounts<'a>,
}

impl<'a> TryFrom<&'a [AccountView]> for Withdraw<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountView]) -> Result<Self, Self::Error> {
        let accounts = WithdrawAccounts::try_from(accounts)?;
        Ok(Self { accounts })
    }
}

impl<'a> Withdraw<'a> {
    pub const DISCRIMINATOR: &'a u8 = &1;
    pub fn process(&mut self) -> ProgramResult {
        let seeds = [
            Seed::from(b"vault"),
            Seed::from(self.accounts.owner.address().as_ref()),
            Seed::from(&self.accounts.bumps),
        ];

        let signers = [Signer::from(&seeds)];
        Transfer {
            from: self.accounts.vault,
            to: self.accounts.owner,
            lamports: self.accounts.vault.lamports(),
        }.invoke_signed(&signers)?;

        Ok(())
    }
}
