use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct User {
    pub name: [u8; 16],
    pub age: u32,
}

impl User {
    pub const SEED_PREFIX: &'static str = "USER";
    pub const LEN: usize = 20;
}
