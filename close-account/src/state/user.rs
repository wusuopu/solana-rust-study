pub struct User<'a> {
    pub name: &'a [u8],
}

impl<'a> User<'a> {
    pub const SEED_PREFIX: &'static str = "USER";
    pub const LEN: usize = 16;
}
